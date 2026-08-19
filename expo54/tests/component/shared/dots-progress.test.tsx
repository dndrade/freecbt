import { render, screen } from "@testing-library/react-native";
import React from "react";
import { DotsProgress } from "@/src/components/dots-progress";

describe("DotsProgress", () => {
    it("renders one dot per step", () => {
        render(<DotsProgress currentIndex={1} count={4} />);

        expect(screen.getAllByTestId("dots-progress-dot")).toHaveLength(4);
    });

    it("marks completed and current dots filled, future dots hollow", () => {
        render(<DotsProgress currentIndex={2} count={4} />);

        const dots = screen.getAllByTestId("dots-progress-dot");
        expect(dots[0].props.className).toContain("bg-accent");
        expect(dots[1].props.className).toContain("bg-accent");
        expect(dots[2].props.className).toContain("bg-accent");
        expect(dots[3].props.className).toContain("border-separator");
    });

    it("exposes an accessible progress value without interactivity", () => {
        render(
            <DotsProgress
                currentIndex={1}
                count={3}
                accessibilityLabel="Onboarding progress"
            />
        );

        const progress = screen.getByRole("progressbar", {
            name: "Onboarding progress",
        });
        expect(progress.props.accessibilityValue).toEqual({
            min: 1,
            max: 3,
            now: 2,
            text: "Step 2 of 3",
        });
        expect(screen.queryAllByRole("button")).toHaveLength(0);
        expect(screen.queryAllByRole("link")).toHaveLength(0);
        for (const dot of screen.getAllByTestId("dots-progress-dot")) {
            expect(dot.props.onPress).toBeUndefined();
        }
    });
});
