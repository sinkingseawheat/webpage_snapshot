import Head from "next/head";
import Image from "next/image";
import { Inter } from "next/font/google";
import styles from "@/styles/Home.module.scss";

// const inter = Inter({ subsets: ["latin"] });

const Home = ()=>{
  return (
    <>
      <section>
        <h2 className="p_header">TOPページです</h2>
      </section>
    </>
  );
}

export default Home;
