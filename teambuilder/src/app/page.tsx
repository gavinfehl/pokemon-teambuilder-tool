import "./css/mainPage.scss";
import { Button } from "@/components/ui/button"


export default function Home() {
  return (
    <div className="flex flex-col items-center justify-center  h-screen">
      <h1 className="text-8xl">Welcome to Team Builder</h1>
      <div className="my-4">
        <Button className="mx-2">Click me</Button>
        <Button className="mx-2">Click me</Button>
      </div>
      
    </div>
  );
}
