import {
  Apple,
  BookOpen,
  Building2,
  House,
  MessageCircle,
  Mic,
  Palette,
  Palmtree,
  PawPrint,
  Smile,
  Sun,
  Users,
} from "lucide-react";
const icons = {
  apple: Apple,
  book: BookOpen,
  town: Building2,
  home: House,
  chat: MessageCircle,
  mic: Mic,
  palette: Palette,
  palm: Palmtree,
  paw: PawPrint,
  smile: Smile,
  sun: Sun,
  people: Users,
};
export function TopicIcon({
  name,
  size = 26,
}: {
  name: string;
  size?: number;
}) {
  const Icon = icons[name as keyof typeof icons] || MessageCircle;
  return <Icon size={size} strokeWidth={1.7} />;
}
