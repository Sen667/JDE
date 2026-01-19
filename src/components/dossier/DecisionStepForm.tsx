import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';

interface DecisionStepFormProps {
  stepName: string;
  stepDescription: string;
  onSubmit: (decision: boolean, notes: string) => void;
  isSubmitting: boolean;
}

export const DecisionStepForm = ({
  stepName,
  stepDescription,
  onSubmit,
  isSubmitting,
}: DecisionStepFormProps) => {
  const [notes, setNotes] = useState('');

  const handleDecision = (decision: boolean) => {
    onSubmit(decision, notes);
  };

  return (
    <Card className="border-2 border-primary">
      <CardHeader>
        <CardTitle className="text-xl">{stepName}</CardTitle>
        <p className="text-muted-foreground">{stepDescription}</p>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          <Label className="text-base font-semibold">Sélectionnez votre décision</Label>
          <div className="flex justify-center gap-4">
            <Button
              type="button"
              variant="default"
              size="lg"
              onClick={() => handleDecision(true)}
              disabled={isSubmitting}
              className="min-w-[120px]"
            >
              OUI
            </Button>
            <Button
              type="button"
              variant="outline"
              size="lg"
              onClick={() => handleDecision(false)}
              disabled={isSubmitting}
              className="min-w-[120px]"
            >
              NON
            </Button>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="notes">Notes et justification (optionnel)</Label>
          <Textarea
            id="notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Ajouter des notes ou une justification..."
            className="min-h-[100px]"
          />
        </div>
      </CardContent>
    </Card>
  );
};
