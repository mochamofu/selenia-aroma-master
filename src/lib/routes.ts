export const routes = {
  login: "/login",
  dashboard: "/dashboard",
  aromas: "/aromas",
  moods: "/moods",
  profile: "/profile",
  admin: "/admin",
};

export const customerTabs = [
  { label: "ホーム", href: "/dashboard", icon: "Home" },
  { label: "コレクション", href: "/aromas", icon: "Layers" },
  { label: "気分から探す", href: "/moods", icon: "Sparkles" },
  { label: "お気に入り", href: "/aromas?tab=favorites", icon: "Heart" },
  { label: "マイページ", href: "/profile", icon: "User" },
] as const;

export const adminTabs = [
  { label: "ダッシュボード", href: "/admin", icon: "BarChart3" },
  { label: "顧客", href: "/admin/customers", icon: "Users" },
  { label: "アロマ記録", href: "/admin/aromas", icon: "FlaskConical" },
  { label: "設定", href: "/admin#settings", icon: "Settings" },
] as const;
