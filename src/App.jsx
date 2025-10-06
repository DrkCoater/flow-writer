import { Theme, Button, Flex, Heading } from '@radix-ui/themes';

function App() {
  return (
    <Theme>
      <Flex direction="column" align="center" justify="center" gap="4" style={{ minHeight: '100vh' }}>
        <Heading size="8">Flow Writer</Heading>
        <Button size="3">Get Started</Button>
      </Flex>
    </Theme>
  );
}

export default App;
