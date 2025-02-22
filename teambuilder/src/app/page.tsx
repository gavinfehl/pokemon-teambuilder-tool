import "./css/mainPage.scss";
import { Button } from "@/components/ui/button"
import Link from 'next/link';


export default function Home() {
  return (
    <div className="flex flex-col items-center justify-center  h-screen">
      <h1 className="text-8xl">Welcome to Team Builder</h1>
      <div className="flex my-8 gap-20">
        <Link href="/sandbox">
          <Button size="wide">sandbox</Button>
        </Link>
        <a href="">
          <Button size="wide">
            Get Started &rarr;
          </Button>
        </a>
      </div>
      
    </div>
  );
}
