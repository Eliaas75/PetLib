import express from "express";
import {requireAuth} from "../middleware/auth.js"
const router = express.Router();

router.get("/ping", requireAuth, (req,res)=> {
    res.json({ok: true, message:"Connecté",user: req.user});
});

export default router;