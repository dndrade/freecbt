import { render, screen } from "@testing-library/react-native";
import React from "react";
import { SegmentedProgress } from "./segmented-progress";

describe("SegmentedProgress", () => {
    it("renders one segment per step", () => {
        render(<SegmentedProgress currentIndex={1} count={4} />);

        expect(screen.getAllByTestId("segmented-progress-segment")).toHaveLength(4);
    });

    it("marks completed, current, and future segments", () => {
        render(<SegmentedProgress currentIndex={2} count={4} />);

        const segments = screen.getAllByTestId("segmented-progress-segment");
        expect(segments[0].props.className).toContain("bg-accent");
        expect(segments[1].props.className).toContain("bg-accent");
        expect(segments[2].props.className).toContain("ring-accent");
        expect(segments[3].props.className).toContain("bg-disabled");
    });

    it("exposes an accessible progress value without interactivity", () => {
        render(
            <SegmentedProgress
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
        for (const segment of screen.getAllByTestId("segmented-progress-segment")) {
            expect(segment.props.onPress).toBeUndefined();
        }
    });
});
