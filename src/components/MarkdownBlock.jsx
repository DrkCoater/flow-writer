import { useState } from 'react';
import styled from '@emotion/styled';
import { Button, Flex, IconButton } from '@radix-ui/themes';
import CodeMirror from '@uiw/react-codemirror';
import { markdown } from '@codemirror/lang-markdown';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

const BlockContainer = styled.div`
  width: 100%;
  border: 1px solid #333;
  border-radius: 8px;
  overflow: hidden;
  margin-bottom: 16px;
  background-color: #1a1a1a;
`;

const ControlBar = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 12px;
  background-color: #252525;
  border-bottom: 1px solid #333;
`;

const PreviewContainer = styled.div`
  padding: 16px;
  min-height: 100px;
  background-color: #1e1e1e;
  color: #e0e0e0;

  h1, h2, h3, h4, h5, h6 {
    margin-top: 16px;
    margin-bottom: 8px;
    color: #ffffff;
  }

  p {
    margin-bottom: 12px;
    line-height: 1.6;
  }

  code {
    background-color: #2a2a2a;
    padding: 2px 6px;
    border-radius: 3px;
    font-family: 'Courier New', monospace;
  }

  pre {
    background-color: #2a2a2a;
    padding: 12px;
    border-radius: 4px;
    overflow-x: auto;
  }

  ul, ol {
    margin-bottom: 12px;
    padding-left: 24px;
  }

  table {
    border-collapse: collapse;
    margin-bottom: 12px;
  }

  th, td {
    border: 1px solid #444;
    padding: 8px;
  }

  th {
    background-color: #2a2a2a;
  }
`;

export function MarkdownBlock({
  id,
  content,
  isRendered,
  onContentChange,
  onToggleRender,
  onDelete,
  onMoveUp,
  onMoveDown,
  onAddBelow,
  isFirst,
  isLast
}) {
  return (
    <BlockContainer>
      <ControlBar>
        <Flex gap="2">
          <Button
            size="1"
            variant="soft"
            onClick={() => onToggleRender(id)}
          >
            {isRendered ? 'Edit' : 'Run'}
          </Button>
          <Button
            size="1"
            variant="soft"
            onClick={() => onAddBelow(id)}
          >
            + Add Block
          </Button>
        </Flex>
        <Flex gap="2">
          <Button
            size="1"
            variant="soft"
            onClick={() => onMoveUp(id)}
            disabled={isFirst}
          >
            Up
          </Button>
          <Button
            size="1"
            variant="soft"
            onClick={() => onMoveDown(id)}
            disabled={isLast}
          >
            Down
          </Button>
          <Button
            size="1"
            variant="soft"
            color="red"
            onClick={() => onDelete(id)}
          >
            Delete
          </Button>
        </Flex>
      </ControlBar>

      {isRendered ? (
        <PreviewContainer>
          <ReactMarkdown remarkPlugins={[remarkGfm]}>
            {content}
          </ReactMarkdown>
        </PreviewContainer>
      ) : (
        <CodeMirror
          value={content}
          height="200px"
          theme="dark"
          extensions={[markdown()]}
          onChange={(value) => onContentChange(id, value)}
        />
      )}
    </BlockContainer>
  );
}
