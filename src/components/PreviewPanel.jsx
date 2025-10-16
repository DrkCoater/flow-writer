import { useSelector } from "react-redux";
import styled from "@emotion/styled";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { selectSections } from "../store/slices/documentSlice";
import { colors, spacing, radii } from "../styles/tokens";
import { formatSectionType } from "../utils/sectionTransform";

const PreviewContainer = styled.div`
  width: 100%;
  height: 100%;
  overflow-y: auto;
  background-color: ${colors.background.base};
  padding: ${spacing.xxl};
`;

const PreviewContent = styled.div`
  width: 100%;
  color: ${colors.text.primary};
  line-height: 1.7;

  h1,
  h2,
  h3,
  h4,
  h5,
  h6 {
    margin-top: ${spacing.xl};
    margin-bottom: ${spacing.md};
    color: ${colors.text.primary};
    font-weight: 600;
  }

  h1 {
    font-size: 2.25rem;
    line-height: 1.2;
    border-bottom: 2px solid ${colors.border.default};
    padding-bottom: ${spacing.md};
  }

  h2 {
    font-size: 1.875rem;
    line-height: 1.3;
  }

  h3 {
    font-size: 1.5rem;
    line-height: 1.4;
  }

  p {
    margin-bottom: ${spacing.lg};
    line-height: 1.7;
  }

  code {
    background-color: ${colors.background.active};
    padding: 2px 6px;
    border-radius: ${radii.sm};
    font-family: "JetBrains Mono", "Fira Code", "Courier New", monospace;
    font-size: 0.9em;
    color: ${colors.text.primary};
  }

  pre {
    background-color: ${colors.background.active};
    border-radius: ${radii.md};
    padding: ${spacing.lg};
    overflow-x: auto;
    margin: ${spacing.lg} 0;
    border: 1px solid ${colors.border.subtle};

    code {
      background: none;
      padding: 0;
      font-size: 0.875rem;
      line-height: 1.6;
    }
  }

  blockquote {
    border-left: 4px solid ${colors.accent.border};
    padding-left: ${spacing.lg};
    margin: ${spacing.lg} 0;
    color: ${colors.text.secondary};
    font-style: italic;
  }

  ul,
  ol {
    margin: ${spacing.md} 0;
    padding-left: ${spacing.xl};

    li {
      margin: ${spacing.sm} 0;
    }
  }

  ul {
    list-style-type: disc;
  }

  ol {
    list-style-type: decimal;
  }

  table {
    width: 100%;
    border-collapse: collapse;
    margin: ${spacing.lg} 0;

    th,
    td {
      border: 1px solid ${colors.border.default};
      padding: ${spacing.md};
      text-align: left;
    }

    th {
      background-color: ${colors.background.elevated};
      font-weight: 600;
    }

    tr:nth-of-type(even) {
      background-color: ${colors.background.hover};
    }
  }

  a {
    color: ${colors.accent.text};
    text-decoration: none;

    &:hover {
      text-decoration: underline;
    }
  }

  hr {
    border: none;
    border-top: 2px solid ${colors.border.default};
    margin: ${spacing.xxl} 0;
  }

  img {
    max-width: 100%;
    height: auto;
    border-radius: ${radii.md};
    margin: ${spacing.lg} 0;
  }
`;

const EmptyState = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: ${colors.text.tertiary};
  font-size: 1.125rem;
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
      <PreviewContainer>
        <EmptyState>
          <p>No content to preview</p>
          <p style={{ fontSize: "0.875rem", marginTop: "8px" }}>Load a document to see the preview</p>
        </EmptyState>
      </PreviewContainer>
    );
  }

  return (
    <PreviewContainer>
      <PreviewContent>
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{combinedContent}</ReactMarkdown>
      </PreviewContent>
    </PreviewContainer>
  );
}
