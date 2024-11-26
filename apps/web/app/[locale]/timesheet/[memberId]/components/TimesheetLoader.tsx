import { BackdropLoader } from "@/lib/components";
import { useEffect, useState } from "react";

export function TimesheetLoader({ show = false }: { show?: boolean }) {
    const [dots, setDots] = useState("");

    useEffect(() => {
        if (!show) {
            setDots(""); // Reset the dots when loader is hidden
            return;
        }

        const interval = setInterval(() => {
            setDots((prev) => (prev.length < 3 ? prev + "." : ""));
        }, 1000); // Update dots every second

        return () => clearInterval(interval); // Cleanup interval on unmount or when `show` changes
    }, [show]);

    return (
        <BackdropLoader show={show} title={`Loading${dots}`} />
    );
}
