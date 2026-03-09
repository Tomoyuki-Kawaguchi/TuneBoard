import type { ReactNode } from 'react';
import { Plus } from 'lucide-react';

import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';

interface CreateAccordionCardProps {
  value: string;
  title: string;
  children: ReactNode;
}

export const CreateAccordionCard = ({
  value,
  title,
  children,
}: CreateAccordionCardProps) => {
  return (
    <Card>
      <Accordion type="single" collapsible>
        <AccordionItem value={value} className="border-b-0">
          <CardHeader>
            <AccordionTrigger className="items-center py-0 hover:no-underline">
              <div className="flex items-center gap-4 text-left">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <Plus className="size-4" />
                </div>
                <div className="space-y-1">
                  <p className="text-base font-semibold text-foreground">{title}</p>
                </div>
              </div>
            </AccordionTrigger>
          </CardHeader>
          <AccordionContent>
            <CardContent className="space-y-4 border-t bg-muted/20 pt-4 mt-2">
              {children}
            </CardContent>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </Card>
  );
};