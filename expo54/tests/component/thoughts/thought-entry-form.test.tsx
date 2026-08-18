import { DistortionData, Thought } from "@/src/model";
import { fireEvent, render, screen } from "@testing-library/react-native";
import { HeroUINativeProvider } from "heroui-native/provider";
import React from "react";
import { ThoughtEntryForm, type ThoughtEntryFormProps } from "@/src/features/thoughts/thought-entry-form";

const translate = ((key: string, values?: Record<string, unknown>) =>
  values ? `${key}:${JSON.stringify(values)}` : key) as ThoughtEntryFormProps["translate"];

/** The form is controlled; the wrapper screens own the value in real use. */
function Harness(
  props: Partial<ThoughtEntryFormProps> & { initial?: Thought.Spec }
) {
  const [value, setValue] = React.useState<Thought.Spec>(
    props.initial ?? Thought.emptySpec()
  );
  return (
    <HeroUINativeProvider>
      <ThoughtEntryForm
        route="home"
        translate={translate}
        distortions={DistortionData.list}
        {...props}
        value={value}
        onChange={(next) => {
          setValue(next);
          props.onChange?.(next);
        }}
      />
    </HeroUINativeProvider>
  );
}

function next() {
  fireEvent.press(screen.getByTestId("thought-entry-next"));
}
function previous() {
  fireEvent.press(screen.getByTestId("thought-entry-previous"));
}
function toLastStep() {
  next();
  next();
  next();
}

describe("ThoughtEntryForm", () => {
  test("walks the four steps in order", () => {
    render(<Harness />);

    expect(screen.getByTestId("automatic-thought-input")).toBeTruthy();
    next();
    expect(screen.getByTestId("distortions-step")).toBeTruthy();
    next();
    expect(screen.getByTestId("challenge-input")).toBeTruthy();
    next();
    expect(screen.getByTestId("alternative-thought-input")).toBeTruthy();
    expect(screen.queryByTestId("thought-entry-next")).toBeNull();
  });

  test("reports the segmented progress for the current step", () => {
    render(<Harness />);
    const progress = screen.getByRole("progressbar");

    expect(screen.getAllByTestId("segmented-progress-segment")).toHaveLength(4);
    expect(progress.props.accessibilityValue).toMatchObject({ now: 1, max: 4 });

    next();
    expect(screen.getByRole("progressbar").props.accessibilityValue).toMatchObject({
      now: 2,
    });
  });

  test("Previous returns to the earlier step and is unavailable on the first", () => {
    render(<Harness />);

    expect(screen.getByTestId("thought-entry-previous").props.accessibilityState)
      .toMatchObject({ disabled: true });

    next();
    next();
    previous();
    expect(screen.getByTestId("distortions-step")).toBeTruthy();
  });

  test("offers Save only on the final step", () => {
    render(<Harness />);

    expect(screen.queryByTestId("thought-entry-save")).toBeNull();
    next();
    expect(screen.queryByTestId("thought-entry-save")).toBeNull();
    next();
    expect(screen.queryByTestId("thought-entry-save")).toBeNull();
    next();
    expect(screen.getByTestId("thought-entry-save")).toBeTruthy();
  });

  test("preserves typed values across step navigation", () => {
    render(<Harness />);

    fireEvent.changeText(screen.getByTestId("automatic-thought-input"), "a thought");
    next();
    next();
    fireEvent.changeText(screen.getByTestId("challenge-input"), "a challenge");
    previous();
    previous();

    expect(screen.getByTestId("automatic-thought-input").props.value).toBe(
      "a thought"
    );
    next();
    next();
    expect(screen.getByTestId("challenge-input").props.value).toBe("a challenge");
  });

  test("keeps selected distortions selected across step navigation", () => {
    const d = DistortionData.list[0];
    render(<Harness />);

    next();
    fireEvent.press(screen.getByTestId(`distortion-${d.slug}`));
    expect(
      screen.getByTestId(`distortion-${d.slug}`).props.accessibilityState
    ).toMatchObject({ checked: true });

    next();
    previous();
    expect(
      screen.getByTestId(`distortion-${d.slug}`).props.accessibilityState
    ).toMatchObject({ checked: true });

    // toggling again clears it
    fireEvent.press(screen.getByTestId(`distortion-${d.slug}`));
    expect(
      screen.getByTestId(`distortion-${d.slug}`).props.accessibilityState
    ).toMatchObject({ checked: false });
  });

  test("labels its fields and controls", () => {
    render(<Harness />);

    expect(
      screen.getByLabelText("auto_thought").props.accessibilityLabel
    ).toBe("auto_thought");
    expect(screen.getByTestId("thought-entry-next").props.accessibilityRole).toBe(
      "button"
    );
    expect(screen.getByRole("progressbar")).toBeTruthy();

    next();
    expect(
      screen.getByTestId(`distortion-${DistortionData.list[0].slug}`).props
        .accessibilityRole
    ).toBe("checkbox");
  });

  test("translates its own controls and announces the step it is on", () => {
    render(<Harness saveError="stuck" onRetry={jest.fn()} />);

    // the progress indicator announces the step, not the app's name
    expect(screen.getByRole("progressbar").props.accessibilityLabel).toBe(
      'cbt_form.step_progress:{"step":1,"count":4}'
    );
    expect(screen.getByText("cbt_form.retry")).toBeTruthy();
    const previous = screen.getByTestId("thought-entry-previous");
    expect(previous.props.accessibilityLabel).toBe("cbt_form.previous");
    expect(screen.getByText("cbt_form.previous")).toBeTruthy();
    const nextButton = screen.getByTestId("thought-entry-next");
    expect(nextButton.props.accessibilityLabel).toBe("cbt_form.next");
    expect(screen.getByText("cbt_form.next")).toBeTruthy();

    next();
    expect(screen.getByRole("progressbar").props.accessibilityLabel).toBe(
      'cbt_form.step_progress:{"step":2,"count":4}'
    );
  });

  test("disables Save with pending text while a save is in flight", () => {
    const onSave = jest.fn();
    render(<Harness isSaving onSave={onSave} />);
    toLastStep();

    const save = screen.getByTestId("thought-entry-save");
    expect(save.props.accessibilityState).toMatchObject({ disabled: true });
    expect(screen.getByText("cbt_form.saving")).toBeTruthy();
    fireEvent.press(save);
    expect(onSave).not.toHaveBeenCalled();
  });

  test("saves from the final step", () => {
    const onSave = jest.fn();
    render(<Harness onSave={onSave} />);
    toLastStep();

    expect(screen.getByText("cbt_form.submit")).toBeTruthy();
    fireEvent.press(screen.getByTestId("thought-entry-save"));
    expect(onSave).toHaveBeenCalledTimes(1);
  });

  test("reports step changes and keeps focus on internal interaction", () => {
    const onStepChange = jest.fn();
    const onFocusRequest = jest.fn();
    render(<Harness onStepChange={onStepChange} onFocusRequest={onFocusRequest} />);

    fireEvent.changeText(screen.getByTestId("automatic-thought-input"), "typing");
    expect(onFocusRequest).toHaveBeenCalled();
    expect(onStepChange).not.toHaveBeenCalled();

    next();
    expect(onStepChange).toHaveBeenCalledWith("distortions", 1);
    expect(onFocusRequest).toHaveBeenCalledTimes(2);
  });

  test("starts on the requested slide, for the edit flow", () => {
    render(<Harness slide="challenge" />);

    expect(screen.getByTestId("challenge-input")).toBeTruthy();
    expect(screen.getByRole("progressbar").props.accessibilityValue).toMatchObject({
      now: 3,
    });
  });

  test("surfaces a save failure with a Retry the wrapper owns", () => {
    const onRetry = jest.fn();
    render(<Harness saveError="disk full" onRetry={onRetry} />);
    toLastStep();

    expect(screen.getByTestId("thought-entry-save-error")).toBeTruthy();
    fireEvent.press(screen.getByTestId("thought-entry-retry"));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });
});
