import { Container } from '@/components/Container';
import { Section } from '@/components/Section';
import { Hero } from '@/components/Hero';

export default function Home() {
  return (
    <main className="min-h-screen">
      <Section>
        <Container>
          <Hero />
        </Container>
      </Section>
    </main>
  );
}
