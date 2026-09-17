import express from "express";
import { Appointment } from "../models/Appointment.js";
import { AvailabilitySlot } from "../models/AvailabilitySlot.js";
import { ClinicMembership } from "../models/ClinicMembership.js";
import { Practitioner } from "../models/Practitioner.js";
import { requireAuth, requireRole } from "../middleware/auth.js";

const router = express.Router();

router.use(requireAuth, requireRole("practitioner", "clinic_admin", "admin"));

async function loadContext(req) {
  const practitioner = await Practitioner.findOne({ userId: req.auth.userId }).lean();
  const memberships = await ClinicMembership.find({ userId: req.auth.userId, status: "active" }).lean();
  return {
    role: req.auth.role,
    practitioner,
    clinicIds: memberships.map((membership) => membership.clinicId),
  };
}

function scope(ctx, field = "practitionerId") {
  if (ctx.role === "admin") return {};
  if (ctx.role === "practitioner") {
    return ctx.practitioner ? { [field]: ctx.practitioner._id } : { _id: null };
  }
  return ctx.clinicIds.length ? { clinicId: { $in: ctx.clinicIds } } : { _id: null };
}

function normalizeDays(value) {
  const parsed = Number(value || 30);
  if ([7, 30, 90, 365].includes(parsed)) return parsed;
  return 30;
}

function roundPercent(value) {
  return Math.round(value * 10) / 10;
}

router.get("/", async (req, res) => {
  try {
    const ctx = await loadContext(req);
    if (ctx.role === "practitioner" && !ctx.practitioner) {
      return res.status(409).json({ error: "Profil praticien requis", code: "PRO_PROFILE_REQUIRED" });
    }

    const days = normalizeDays(req.query.days);
    const to = new Date();
    const from = new Date(to.getTime() - days * 24 * 60 * 60 * 1000);
    const appointmentScope = scope(ctx, "practitionerId");
    const slotScope = scope(ctx, "practitionerId");
    const appointmentPeriod = { startsAt: { $gte: from, $lt: to } };
    const slotPeriod = { startsAt: { $gte: from, $lt: to } };

    const [
      totalAppointments,
      confirmedAppointments,
      completedAppointments,
      cancelledAppointments,
      noShowAppointments,
      directAppointments,
      waitlistAppointments,
      totalSlots,
      bookableSlots,
      bookedSlots,
      dailyAppointments,
    ] = await Promise.all([
      Appointment.countDocuments({ ...appointmentScope, ...appointmentPeriod }),
      Appointment.countDocuments({ ...appointmentScope, ...appointmentPeriod, status: "confirmed" }),
      Appointment.countDocuments({ ...appointmentScope, ...appointmentPeriod, status: "completed" }),
      Appointment.countDocuments({ ...appointmentScope, ...appointmentPeriod, status: "cancelled" }),
      Appointment.countDocuments({ ...appointmentScope, ...appointmentPeriod, status: "no_show" }),
      Appointment.countDocuments({ ...appointmentScope, ...appointmentPeriod, source: "direct", status: { $ne: "cancelled" } }),
      Appointment.countDocuments({ ...appointmentScope, ...appointmentPeriod, source: "waitlist", status: { $ne: "cancelled" } }),
      AvailabilitySlot.countDocuments({ ...slotScope, ...slotPeriod }),
      AvailabilitySlot.countDocuments({ ...slotScope, ...slotPeriod, status: { $ne: "blocked" } }),
      AvailabilitySlot.countDocuments({ ...slotScope, ...slotPeriod, status: "booked" }),
      Appointment.aggregate([
        { $match: { ...appointmentScope, ...appointmentPeriod, status: { $ne: "cancelled" } } },
        {
          $group: {
            _id: {
              $dateToString: {
                format: "%Y-%m-%d",
                date: "$startsAt",
                timezone: "Europe/Paris",
              },
            },
            total: { $sum: 1 },
            waitlist: { $sum: { $cond: [{ $eq: ["$source", "waitlist"] }, 1, 0] } },
          },
        },
        { $sort: { _id: 1 } },
      ]),
    ]);

    const occupancyRate = bookableSlots ? roundPercent((bookedSlots / bookableSlots) * 100) : 0;
    const cancellationRate = totalAppointments ? roundPercent((cancelledAppointments / totalAppointments) * 100) : 0;
    const noShowRate = totalAppointments ? roundPercent((noShowAppointments / totalAppointments) * 100) : 0;
    const activeNonCancelled = directAppointments + waitlistAppointments;
    const waitlistShare = activeNonCancelled ? roundPercent((waitlistAppointments / activeNonCancelled) * 100) : 0;

    return res.json({
      period: { days, from, to },
      metrics: {
        totalAppointments,
        confirmedAppointments,
        completedAppointments,
        cancelledAppointments,
        noShowAppointments,
        directAppointments,
        waitlistAppointments,
        totalSlots,
        bookableSlots,
        bookedSlots,
        occupancyRate,
        cancellationRate,
        noShowRate,
        waitlistShare,
      },
      daily: dailyAppointments.map((item) => ({
        date: item._id,
        total: item.total,
        waitlist: item.waitlist,
      })),
    });
  } catch (error) {
    console.error("pro_stats_error", error);
    return res.status(500).json({ error: "Impossible de charger les statistiques professionnelles" });
  }
});

export default router;
