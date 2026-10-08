import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Footer } from "../../components/layout/footer";
import { Header } from "../../components/layout/header";
import { BlockRenderer } from "../../lib/block-renderer";
import { getPage } from "../../lib/content-api";
import { isCmsEnabled } from "../../lib/site-config";

export const instant = false;

export async function generateMetadata({ params }: { params: Promise<{ slug: string[] }> }): Promise<Metadata> {
  if (!isCmsEnabled()) notFound();
  const slug = paramsToSlug(await params);
  const page = await loadPage(slug);
  return { title: page.title, description: page.description };
}

function paramsToSlug(params: { slug: string[] }) { return params.slug.join("/"); }

async function loadPage(slug: string) {
  try {
    return await getPage(slug);
  } catch (error) {
    if (error instanceof Error && error.message.includes("404")) notFound();
    throw error;
  }
}

export default async function ContentPage({ params }: { params: Promise<{ slug: string[] }> }) {
  if (!isCmsEnabled()) notFound();
  const slug = paramsToSlug(await params);
  const page = await loadPage(slug);
  return (
    <>
      <Header />
      <main><BlockRenderer blocks={page.blocks} /></main>
      <Footer />
    </>
  );
}
