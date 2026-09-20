import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Footer } from "../../components/layout/footer";
import { Header } from "../../components/layout/header";
import { BlockRenderer } from "../../lib/block-renderer";
import { getPage } from "../../lib/content-api";

export const instant = false;

export async function generateMetadata({ params }: { params: Promise<{ slug?: string[] }> }): Promise<Metadata> {
  const page = await getPage(paramsToSlug(await params));
  return { title: page.title, description: page.description };
}

function paramsToSlug(params: { slug?: string[] }) { return params.slug?.join("/") || "home"; }

async function loadPage(slug: string) {
  try {
    return await getPage(slug);
  } catch (error) {
    if (error instanceof Error && error.message.includes("404")) notFound();
    throw error;
  }
}

export default async function ContentPage({ params }: { params: Promise<{ slug?: string[] }> }) {
  const page = await loadPage(paramsToSlug(await params));
  return (
    <>
      <Header />
      <main><BlockRenderer blocks={page.blocks} /></main>
      <Footer />
    </>
  );
}