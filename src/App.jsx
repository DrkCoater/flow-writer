import { Theme, Flex, Heading, Button } from '@radix-ui/themes';
import { useState } from 'react';
import { MarkdownBlock } from './components/MarkdownBlock';

function App() {
  const [blocks, setBlocks] = useState([
    {
      id: 1,
      content: '# Welcome to Flow Writer\n\nThis is a block-based markdown editor.',
      isRendered: true
    },
    {
      id: 2,
      content: '## Features\n\n- Edit markdown block by block\n- Toggle between edit and preview mode\n- Add, delete, and reorder blocks\n- GitHub Flavored Markdown support',
      isRendered: false
    }
  ]);

  const [nextId, setNextId] = useState(3);

  const handleContentChange = (id, newContent) => {
    setBlocks(blocks.map(block =>
      block.id === id ? { ...block, content: newContent } : block
    ));
  };

  const handleToggleRender = (id) => {
    setBlocks(blocks.map(block =>
      block.id === id ? { ...block, isRendered: !block.isRendered } : block
    ));
  };

  const handleDelete = (id) => {
    if (blocks.length > 1) {
      setBlocks(blocks.filter(block => block.id !== id));
    }
  };

  const handleMoveUp = (id) => {
    const index = blocks.findIndex(block => block.id === id);
    if (index > 0) {
      const newBlocks = [...blocks];
      [newBlocks[index - 1], newBlocks[index]] = [newBlocks[index], newBlocks[index - 1]];
      setBlocks(newBlocks);
    }
  };

  const handleMoveDown = (id) => {
    const index = blocks.findIndex(block => block.id === id);
    if (index < blocks.length - 1) {
      const newBlocks = [...blocks];
      [newBlocks[index], newBlocks[index + 1]] = [newBlocks[index + 1], newBlocks[index]];
      setBlocks(newBlocks);
    }
  };

  const handleAddBelow = (id) => {
    const index = blocks.findIndex(block => block.id === id);
    const newBlock = {
      id: nextId,
      content: '# New Block\n\nStart editing here...',
      isRendered: false
    };
    const newBlocks = [...blocks];
    newBlocks.splice(index + 1, 0, newBlock);
    setBlocks(newBlocks);
    setNextId(nextId + 1);
  };

  const handleAddBlock = () => {
    setBlocks([...blocks, {
      id: nextId,
      content: '# New Block\n\nStart editing here...',
      isRendered: false
    }]);
    setNextId(nextId + 1);
  };

  return (
    <Theme appearance="dark">
      <Flex direction="column" align="center" gap="4" style={{ minHeight: '100vh', padding: '40px' }}>
        <Heading size="8">Flow Writer</Heading>

        <div style={{ width: '100%', maxWidth: '900px' }}>
          {blocks.map((block, index) => (
            <MarkdownBlock
              key={block.id}
              id={block.id}
              content={block.content}
              isRendered={block.isRendered}
              onContentChange={handleContentChange}
              onToggleRender={handleToggleRender}
              onDelete={handleDelete}
              onMoveUp={handleMoveUp}
              onMoveDown={handleMoveDown}
              onAddBelow={handleAddBelow}
              isFirst={index === 0}
              isLast={index === blocks.length - 1}
            />
          ))}

          <Button
            size="3"
            variant="soft"
            style={{ width: '100%', marginTop: '16px' }}
            onClick={handleAddBlock}
          >
            + Add New Block
          </Button>
        </div>
      </Flex>
    </Theme>
  );
}

export default App;
