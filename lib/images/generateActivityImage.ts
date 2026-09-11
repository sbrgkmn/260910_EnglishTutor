import "server-only";
import type { Activity } from "../activities/activityTypes";
import {
  imageProvider,
  localImageConfig,
  type ImageConfig,
  type ImageProvider,
} from "./provider";
export function activityImagePrompt(activity: Activity) {
  return `Create only the scenic BACKGROUND for a visual English game for children aged 7–12. ${activity.scene.description} Warm storybook illustration, soft green hills, pale blue sky, gentle sunshine, calm uncluttered composition, landscape format. Keep the center and foreground clear. The application will separately draw these authored lesson objects: ${activity.scene.objects.map((o) => o.label).join(", ")}. DO NOT draw those objects, people, animals, benches, trees in the foreground, or text. No photorealistic people. No weapons, violence, frightening imagery, sexual content, alcohol, drugs, politics, brands, logos, or copyrighted characters. Cultural neutrality; cheerful, clear, non-scary educational scenery. Only the environment is generated. Lesson objects and their positions are fixed by our authored overlay.`;
}
export async function generateActivityImage(
  activity: Activity,
  config: ImageConfig = localImageConfig(),
  signal?: AbortSignal,
  provider: ImageProvider | null = imageProvider(config),
): Promise<Activity> {
  if (!provider || activity.scene.composition === "illustration")
    return activity;
  try {
    const { dataUrl } = await provider.generate(
      activityImagePrompt(activity),
      signal,
    );
    return {
      ...activity,
      scene: {
        ...activity.scene,
        background: dataUrl,
        imageSource: "generated",
        generatedAt: new Date().toISOString(),
      },
    };
  } catch {
    return activity;
  }
}
