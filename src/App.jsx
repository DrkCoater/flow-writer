import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";

function App() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4">
      <div className="absolute right-4 top-4">
        <ThemeToggle />
      </div>
      <Button>Hello World</Button>
    </div>
  );
}

export default App;
