import { useCreateBlockNote } from "@blocknote/react";
import { BlockNoteView } from "@blocknote/shadcn";
import { ThemeToggle } from "@/components/theme-toggle";

function App() {
  const editor = useCreateBlockNote();

  return (
    <div className="relative w-full h-screen">
      <div className="absolute right-4 top-4 z-[99]">
        <ThemeToggle />
      </div>
      <div className="relative overflow-visible">
        <BlockNoteView
          editor={editor}
          className="h-full"
          slashMenu
          formattingToolbar

        />
      </div>
    </div>
  );
}

export default App;
