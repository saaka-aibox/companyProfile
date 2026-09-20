import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { PageEditorClient } from "@/components/editor/page-editor-client";
import type { Block, Page } from "@/types/content";

interface PageEditorPageProps {
  params: Promise<{ pageId: string }>;
}

export default async function PageEditorPage({ params }: PageEditorPageProps) {
  const { pageId } = await params;

  const page = await db.page.findUnique({
    where: { id: pageId },
  });

  if (!page) notFound();

  const serializedPage: Page = {
    id: page.id,
    slug: page.slug,
    title: page.title,
    description: page.description || "",
    status: (page.status?.toUpperCase() === "PUBLISHED" ? "PUBLISHED" : "DRAFT") as "DRAFT" | "PUBLISHED",
    blocks: (Array.isArray(page.blocks) ? page.blocks : []) as unknown as Block[],
    publishedAt: page.publishedAt ? page.publishedAt.toISOString() : undefined,
  };

  return <PageEditorClient page={serializedPage} />;
}