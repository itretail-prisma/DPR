// src/components/Footer.jsx
import React, { useEffect, useState } from "react";
import { useUser } from "../contexts/UserContext";

function Footer() {
    const [currentTime, setCurrentTime] = useState(new Date());
    const [marqueeText, setMarqueeText] = useState(
        localStorage.getItem("marqueeText")
    );
    const [showModal, setShowModal] = useState(false);
    const [tempText, setTempText] = useState("");
    const { userInfo } = useUser();
    const isAdmin = userInfo?.isAdmin; // already a boolean

    useEffect(() => {
        const interval = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => clearInterval(interval);
    }, []);

    const formatDateTime = (date) => {
        const day = String(date.getDate()).padStart(2, "0");
        const month = String(date.getMonth() + 1).padStart(2, "0");
        const year = date.getFullYear();
        const time = date.toLocaleTimeString();
        return `${day}-${month}-${year}  ${time}`;
    };

    const handleSave = () => {
        setMarqueeText(tempText);
        localStorage.setItem("marqueeText", tempText);
        setShowModal(false);
    };

    return (
        <div
            style={{
                backgroundColor: "#c7bebeff",
                color: "#ff0080ff",
                display: "flex",
                alignItems: "center",
                padding: "8px",
                position: "fixed",
                bottom: 0,
                width: "100%",
                height: "2%",
                fontWeight: 500,
                fontFamily: "Trebuchet MS",
                fontSize: "18px",
                overflow: "hidden",
            }}
        >
            <span style={{ flexShrink: 0, paddingRight: "10px" }}>
                © DPR {currentTime.getFullYear()} - PRISMA GARMENTS - Powered by Truvisory
                Analytix &nbsp;&nbsp;
                {formatDateTime(currentTime)}
            </span>

            <marquee
                style={{
                    flexGrow: 1,
                    whiteSpace: "nowrap",
                    fontWeight: "bold",
                }}
                scrollamount="5"
            >
                <span style={{ color: "#0011ffff" }}>{marqueeText}</span>
            </marquee>

            {/* ✏️ Edit Icon */}
            {isAdmin && (
                <button
                    onClick={() => {
                        setTempText(marqueeText);
                        setShowModal(true);
                    }}
                    style={{
                        marginLeft: "10px",
                        background: "transparent",
                        border: "none",
                        cursor: "pointer",
                        fontSize: "20px",
                        color: "#0011ff",
                    }}
                    title="Edit Marquee"
                >
                    ✏️
                </button>
            )}
            {/* Modal */}
            {showModal && (
                <div
                    style={{
                        position: "fixed",
                        top: 0,
                        left: 0,
                        width: "100vw",
                        height: "100vh",
                        backgroundColor: "rgba(0,0,0,0.5)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        zIndex: 9999, // keeps it above everything
                    }}
                >
                    <div
                        style={{
                            background: "#fff",
                            padding: "25px",
                            borderRadius: "12px",
                            width: "450px",
                            height: "350px",
                            boxShadow: "0 8px 20px rgba(0,0,0,0.3)",
                            animation: "fadeIn 0.3s ease",
                        }}
                    >
                        <h3
                            style={{
                                marginBottom: "15px",
                                fontSize: "20px",
                                fontWeight: "bold",
                                color: "#0011ff",
                                textAlign: "center",
                            }}
                        >
                            ✏️ Edit Flyer Message
                        </h3>

                        <textarea
                            value={tempText}
                            onChange={(e) => setTempText(e.target.value)}
                            rows="4"
                            style={{
                                width: "100%",
                                height: "60%",
                                marginBottom: "15px",
                                marginRight: "15px",
                                padding: "10px",
                                fontSize: "16px",
                                border: "1px solid #ccc",
                                borderRadius: "8px",
                                resize: "none",
                            }}
                        />

                        <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
                            <button
                                onClick={handleSave}
                                style={{
                                    padding: "8px 16px",
                                    backgroundColor: "#0011ff",
                                    color: "#fff",
                                    border: "none",
                                    borderRadius: "6px",
                                    cursor: "pointer",
                                    fontWeight: "bold",
                                }}
                            >
                                Save
                            </button>
                            <button
                                onClick={() => setShowModal(false)}
                                style={{
                                    padding: "8px 16px",
                                    backgroundColor: "#888",
                                    color: "#fff",
                                    border: "none",
                                    borderRadius: "6px",
                                    cursor: "pointer",
                                    fontWeight: "bold",
                                }}
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
}

export default Footer;
