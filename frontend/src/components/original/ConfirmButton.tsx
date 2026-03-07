import { Button } from "@/components/ui/button";
import { useOutsideClick } from "@/lib/useOutsideClick";
import { X } from "lucide-react";
import { useRef, useState } from "react";

export const ConfirmButton = ({ children, onClick }: { onClick?: () => void; onSubmit?: () => void; children: React.ReactNode }) => {
    const [isConfirmingMode, setIsConfirming] = useState(false);
    const ref = useRef<HTMLDivElement>(null);
    useOutsideClick({ ref, callback: () => setIsConfirming(false) });

    return (
        <div ref={ref}>
            {isConfirmingMode ? 
                <div className="flex items-center space-x-2">
                    <Button onClick={onClick} type="button">
                        {"本当に"+children}
                    </Button> 
                    <Button variant="secondary" onClick ={()=>{setIsConfirming(false)}}>
                        <X/> 
                    </Button>
                </div>
                : 
                <Button onClick={()=>{setIsConfirming(true)}} type="button">
                    {children}
                </Button>
            }
        </div>
    );
}