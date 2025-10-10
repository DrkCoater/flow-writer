import { Theme, Flex, Heading, Button, Spinner, Callout } from '@radix-ui/themes';
import { useState, useEffect } from 'react';
import { ExclamationTriangleIcon } from '@radix-ui/react-icons';
import { MarkdownBlock } from './components/MarkdownBlock';
import { useContextDocument } from './hooks/useContextDocument';
import { sectionsToBlocks } from './utils/sectionTransform';

function App() {
  const { sections, loading, error } = useContextDocument();
  const [blocks, setBlocks] = useState([]);
  const [nextId, setNextId] = useState(1);

  // Load sections from backend
  useEffect(() => {
    if (sections.length > 0) {
      const transformedBlocks = sectionsToBlocks(sections);
      setBlocks(transformedBlocks);
      // Set nextId based on loaded sections (for new blocks)
      setNextId(sections.length + 1);
    }
  }, [sections]);

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
      id: `new-${nextId}`,
      content: '# New Block\n\nStart editing here...',
      isRendered: false,
      sectionId: `new-${nextId}`,
      sectionType: 'notes'
    };
    const newBlocks = [...blocks];
    newBlocks.splice(index + 1, 0, newBlock);
    setBlocks(newBlocks);
    setNextId(nextId + 1);
  };

  const handleAddBlock = () => {
    setBlocks([...blocks, {
      id: `new-${nextId}`,
      content: '# New Block\n\nStart editing here...',
      isRendered: false,
      sectionId: `new-${nextId}`,
      sectionType: 'notes'
    }]);
    setNextId(nextId + 1);
  };

  return (
    <Theme appearance="dark">
      <Flex direction="column" align="center" gap="4" style={{ minHeight: '100vh', padding: '40px' }}>
        <div style={{ width: '100%', maxWidth: '900px' }}>
          {loading && (
            <Flex justify="center" align="center" style={{ minHeight: '200px' }}>
              <Spinner size="3" />
            </Flex>
          )}

          {error && (
            <Callout.Root color="red" style={{ marginBottom: '16px' }}>
              <Callout.Icon>
                <ExclamationTriangleIcon />
              </Callout.Icon>
              <Callout.Text>
                <strong>Error loading document:</strong> {error}
              </Callout.Text>
            </Callout.Root>
          )}

          {!loading && !error && blocks.length === 0 && (
            <Callout.Root style={{ marginBottom: '16px' }}>
              <Callout.Text>
                No sections loaded. Click "Add New Block" to start.
              </Callout.Text>
            </Callout.Root>
          )}

          {!loading && blocks.map((block, index) => (
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
              sectionType={block.sectionType}
              sectionId={block.sectionId}
            />
          ))}

          {!loading && (
            <Button
              size="3"
              variant="soft"
              style={{ width: '100%', marginTop: '16px' }}
              onClick={handleAddBlock}
            >
              + Add New Block
            </Button>
          )}
        </div>
      </Flex>
    </Theme>
  );
}

export default App;
