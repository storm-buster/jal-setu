import * as React from "react"
import { cn } from "@/lib/utils"

interface SliderProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'value'> {
    value: number[];
    max: number;
    step: number;
    onValueChange: (value: number[]) => void;
}

const Slider = React.forwardRef<HTMLInputElement, SliderProps>(
    ({ className, value, max, step, onValueChange, ...props }, ref) => (
        <input
            type="range"
            className={cn(
                "w-full h-2 bg-secondary rounded-lg appearance-none cursor-pointer accent-primary",
                className
            )}
            ref={ref}
            value={value[0]}
            max={max}
            step={step}
            onChange={(e) => onValueChange([Number(e.target.value)])}
            {...props}
        />
    )
)
Slider.displayName = "Slider"

export { Slider }
