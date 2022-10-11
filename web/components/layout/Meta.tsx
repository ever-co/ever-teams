import Head from "next/head";

interface MetaProps {
  title: string;
  keywords: string;
  description: string;
}

const Meta = ({ title, keywords, description }: MetaProps) => {
  return (
    <Head>
      <meta name="keywords" content={keywords} />
      <meta name="description" content={description} />
      <title>{title}</title>
    </Head>
  );
};

Meta.defaultProps = {
  title: "Gauzy - team ",
  keywords: "",
  description: "",
};

export default Meta;
