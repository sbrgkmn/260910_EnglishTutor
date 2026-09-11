import type {
  ActivityScene,
  SceneObject,
} from "@/lib/activities/activityTypes";
export function ObjectPicture({
  scene,
  object,
}: {
  scene: ActivityScene;
  object: SceneObject;
}) {
  if (scene.composition !== "illustration")
    return <img src={`/scenes/${object.id}.svg`} alt="" />;
  const b = object.hitbox;
  return (
    <span
      className="object-picture"
      aria-hidden="true"
      style={{
        backgroundImage: `url("${scene.background}")`,
        backgroundSize: `${100 / b.width}% ${100 / b.height}%`,
        backgroundPosition: `${(b.x / (1 - b.width)) * 100}% ${(b.y / (1 - b.height)) * 100}%`,
      }}
    />
  );
}
