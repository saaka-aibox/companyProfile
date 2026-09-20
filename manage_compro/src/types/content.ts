export type ColorScheme = {
  background?: string;
  text?: string;
  accent?: string;
  border?: string;
};

export type Spacing = {
  paddingTop?: string;
  paddingBottom?: string;
  paddingLeft?: string;
  paddingRight?: string;
  gap?: string;
};

export type Border = {
  radius?: string;
  width?: string;
  color?: string;
};

export type Shadow = {
  boxShadow?: string;
};

export type ButtonStyle = {
  variant?: "primary" | "outline" | "dark" | "ghost";
  size?: "small" | "medium" | "large";
  borderRadius?: string;
};

export type LayoutVariant =
  | "default"
  | "centered"
  | "split"
  | "stacked"
  | "grid"
  | "carousel";

export type Block =
  | {
      type: "hero";
      eyebrow?: string;
      title: string;
      body?: string;
      cta?: { label: string; href: string; style?: ButtonStyle };
      secondaryCta?: { label: string; href: string; style?: ButtonStyle };
      stats?: { label: string; value: string }[];
      layout?: LayoutVariant;
      colorScheme?: ColorScheme;
      spacing?: Spacing;
      backgroundImage?: string;
      backgroundVideo?: string;
    }
  | {
      type: "featureGrid";
      eyebrow?: string;
      title?: string;
      subtitle?: string;
      features: {
        title: string;
        description: string;
        icon?: string;
        image?: string;
      }[];
      steps?: {
        step: string;
        title: string;
        subtitle?: string;
        icon?: string;
      }[];
      columns?: 2 | 3 | 4;
      layout?: LayoutVariant;
      colorScheme?: ColorScheme;
      spacing?: Spacing;
    }
  | {
      type: "cta";
      title: string;
      body?: string;
      label?: string;
      href?: string;
      cta?: {
        label?: string;
        href?: string;
        style?: ButtonStyle;
      };
      style?: ButtonStyle;
      layout?: LayoutVariant;
      colorScheme?: ColorScheme;
      spacing?: Spacing;
    }
  | {
      type: "contactForm";
      title?: string;
      subtitle?: string;
      email?: string;
      fields?: {
        name?: string;
        email?: string;
        message?: string;
        custom?: { label: string; type: "text" | "email" | "textarea" | "select"; required?: boolean; options?: string[] }[];
      };
      layout?: LayoutVariant;
      colorScheme?: ColorScheme;
      spacing?: Spacing;
      buttonStyle?: ButtonStyle;
    }
  | {
      type: "testimonials";
      title?: string;
      subtitle?: string;
      testimonials: {
        quote: string;
        author: string;
        role?: string;
        avatar?: string;
        rating?: number;
      }[];
      layout?: "carousel" | "grid" | "masonry";
      colorScheme?: ColorScheme;
      spacing?: Spacing;
    }
  | {
      type: "pricing";
      eyebrow?: string;
      title?: string;
      subtitle?: string;
      plans: {
        name: string;
        price: string;
        period?: string;
        description?: string;
        features: string[];
        cta: { label: string; href: string; style?: ButtonStyle };
        featured?: boolean;
        badge?: string;
      }[];
      layout?: "grid" | "carousel";
      colorScheme?: ColorScheme;
      spacing?: Spacing;
    }
  | {
      type: "stats";
      title?: string;
      subtitle?: string;
      stats: {
        label: string;
        value: string;
        description?: string;
        icon?: string;
      }[];
      layout?: "grid" | "inline";
      colorScheme?: ColorScheme;
      spacing?: Spacing;
    }
  | {
      type: "story";
      eyebrow?: string;
      title?: string;
      subtitle?: string;
      body?: string;
      image?: string;
      imagePosition?: "left" | "right";
      cta?: { label: string; href: string; style?: ButtonStyle };
      secondaryCta?: { label: string; href: string; style?: ButtonStyle };
      tags?: string[];
      layout?: "split" | "stacked";
      colorScheme?: ColorScheme;
      spacing?: Spacing;
    }
  | {
      type: "gallery";
      eyebrow?: string;
      title?: string;
      subtitle?: string;
      items: {
        title: string;
        image?: string;
        tag?: string;
        tone?: "gold" | "purple" | "pink" | "blue" | "default";
        description?: string;
      }[];
      columns?: 2 | 3 | 4;
      layout?: "grid" | "carousel";
      colorScheme?: ColorScheme;
      spacing?: Spacing;
    }
  | {
      type: "faq";
      eyebrow?: string;
      title?: string;
      subtitle?: string;
      items: {
        question: string;
        answer: string;
      }[];
      colorScheme?: ColorScheme;
      spacing?: Spacing;
    }
  | {
      type: "divider";
      style?: "solid" | "dashed" | "dotted";
      color?: string;
      colorScheme?: ColorScheme;
      spacing?: Spacing;
    };

export type Page = {
  id: string;
  slug: string;
  title: string;
  description?: string;
  blocks: Block[];
  status: "DRAFT" | "PUBLISHED" | "draft" | "published";
  publishedAt?: string;
};

export type Navigation = {
  items: { label: string; href: string }[];
};

export type BlockType = Block["type"];

export type SiteSettings = {
  siteName: string;
  description?: string;
  favicon?: string;
  logo?: string;
  theme?: {
    primaryColor?: string;
    secondaryColor?: string;
    fontFamily?: string;
  };
};