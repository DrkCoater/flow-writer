import { forwardRef } from "react";
import { useSelector } from "react-redux";
import styled from "@emotion/styled";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { selectBlocks } from "@/store/slices/documentSlice";
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

export const PreviewPanel = forwardRef(({ onScroll }, ref) => {
  const blocks = useSelector(selectBlocks);

  // Group blocks by section and combine into a single markdown document
  const combinedContent = (() => {
    if (blocks.length === 0) return "";

    // Group blocks by parentSectionId
    const sectionMap = new Map();
    blocks.forEach(block => {
      const sectionId = block.parentSectionId;
      if (!sectionMap.has(sectionId)) {
        sectionMap.set(sectionId, {
          type: block.sectionType,
          blocks: []
        });
      }
      sectionMap.get(sectionId).blocks.push(block);
    });

    // Build combined content
    const sectionContents = Array.from(sectionMap.values()).map((section, index) => {
      // Combine all blocks in this section
      const sectionContent = section.blocks.map(b => b.content).join("\n\n");
      const sectionHeader = `## ${formatSectionType(section.type)}`;

      return index === 0
        ? `${sectionHeader}\n\n${sectionContent}`
        : `\n\n---\n\n${sectionHeader}\n\n${sectionContent}`;
    });

    return sectionContents.join("");
  })();

  if (blocks.length === 0) {
    return (
      <PanelWrapper ref={ref} onScroll={onScroll}>
        <EmptyState>
          <p>No content to preview</p>
          <EmptyStateSubtext>Load a document to see the preview</EmptyStateSubtext>
        </EmptyState>
      </PanelWrapper>
    );
  }

  return (
    <PanelWrapper ref={ref} onScroll={onScroll}>
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{combinedContent}</ReactMarkdown>
    </PanelWrapper>
  );
});

PreviewPanel.displayName = 'PreviewPanel';
