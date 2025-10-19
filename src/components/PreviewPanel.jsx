import { useSelector } from "react-redux";
import styled from "@emotion/styled";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { selectSections } from "@/store/slices/documentSlice";
import { formatSectionType } from "@/utils/sectionTransform";
import PanelWrapper from "@/components/PanelWrapper";

const EmptyState = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: var(--gray-10);
  font-size: 1.125rem;
`;

const EmptyStateSubtext = styled.p`
  font-size: 0.875rem;
  margin-top: 8px;
`;

export function PreviewPanel() {
  const sections = useSelector(selectSections);

  // Combine all sections into a single markdown document
  const combinedContent =
    sections.length > 0
      ? sections
          .map((section, index) => {
            const sectionHeader = `\n\n## ${formatSectionType(section.section_type || section.type)}\n\n`;
            return index === 0
              ? `## ${formatSectionType(section.section_type || section.type)}\n\n${section.content || ""}`
              : `${sectionHeader}${section.content || ""}`;
          })
          .join("\n\n---\n")
      : "";

  if (sections.length === 0) {
    return (
      <PanelWrapper>
        <EmptyState>
          <p>No content to preview</p>
          <EmptyStateSubtext>Load a document to see the preview</EmptyStateSubtext>
        </EmptyState>
      </PanelWrapper>
    );
  }

  return (
    <PanelWrapper>
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{combinedContent}</ReactMarkdown>
    </PanelWrapper>
  );
}
