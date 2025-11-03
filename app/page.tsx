import { Section } from '@/components/Section';
import { Hero } from '@/components/Hero';
import { Testimonials } from '@/components/Testimonials';

export default function Home() {
  return (
    <>
      <Section className="bg-white text-black">
        <Hero />
      </Section>
      <Testimonials />
    </>
  );
}
