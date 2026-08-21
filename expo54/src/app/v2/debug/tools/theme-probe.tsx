import { Section, StandardScreen } from "@/src/components";
import { Button, Typography } from "heroui-native";

export default function ThemeProbe() {
    return (
        <StandardScreen>
            <Section>
                <Typography type="h1">
                    FreeCBT
                </Typography>

                <Typography type="body" color="muted">
                    Core UI foundation probe
                </Typography>
            </Section>

            <Section className="mt-6">
                <Typography type="h3">Actions</Typography>

                <Button variant="primary">
                    Primary
                </Button>

                <Button variant="secondary">
                    Secondary
                </Button>

                <Button variant="tertiary">
                    Tertiary
                </Button>

                <Button variant="danger">
                    Destructive
                </Button>
            </Section>
        </StandardScreen>
    );
}