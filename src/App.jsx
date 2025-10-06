import { Theme, Flex, Heading } from '@radix-ui/themes';
import styled from '@emotion/styled';
import CodeMirror from '@uiw/react-codemirror';
import { javascript } from '@codemirror/lang-javascript';
import { useState } from 'react';

function App() {
  const [code, setCode] = useState("console.log('Hello, Flow Writer!');");

  return (
    <Theme appearance="dark">
      <Flex direction="column" align="center" gap="4" style={{ minHeight: '100vh', padding: '40px' }}>
        <div style={{ width: '100%', maxWidth: '800px' }}>
          <CodeMirror
            value={code}
            height="400px"
            theme="dark"
            extensions={[javascript()]}
            onChange={(value) => setCode(value)}
          />
        </div>
      </Flex>
    </Theme>
  );
}

export default App;
