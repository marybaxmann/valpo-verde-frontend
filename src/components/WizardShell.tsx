import React from "react";
import { Icon } from "./Icons";

export interface WizardStepDef {
  key: string;
  label: string;
}

export function WizardShell({
  steps,
  currentIndex,
  onBack,
  onNext,
  backLabel = "Anterior",
  nextLabel = "Guardar y continuar",
  nextDisabled = false,
  showAutosave = true,
  children,
}: {
  steps: WizardStepDef[];
  currentIndex: number;
  onBack: () => void;
  onNext: () => void;
  backLabel?: string;
  nextLabel?: string;
  nextDisabled?: boolean;
  showAutosave?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="card card--pad">
      <div className="wizard">
        <div className="wizard__steps">
          {steps.map((step, i) => (
            <div
              key={step.key}
              className={`wizard__step ${i < currentIndex ? "done" : ""} ${
                i === currentIndex ? "current" : ""
              }`}
            >
              <span className="wizard__step-num">
                {i < currentIndex ? <Icon name="check" size={12} /> : i + 1}
              </span>
              {step.label}
            </div>
          ))}
        </div>
        <div className="wizard__body">
          {children}
          <div className="wizard__footer">
            {showAutosave ? (
              <span className="autosave">
                <Icon name="check-square" size={14} />
                Guardado automáticamente
              </span>
            ) : (
              <span />
            )}
            <div style={{ display: "flex", gap: 8 }}>
              <button
                className="btn btn-secondary"
                onClick={onBack}
                disabled={currentIndex === 0}
              >
                <Icon name="arrow-left" size={14} />
                {backLabel}
              </button>
              <button className="btn btn-primary" onClick={onNext} disabled={nextDisabled}>
                {nextLabel}
                <Icon name="arrow-right" size={14} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
