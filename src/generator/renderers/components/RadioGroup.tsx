import React from 'react';

interface RadioOption {
  label: string;
  value: string;
  description?: string;
}

interface DiscordRadioGroupProps {
  options: RadioOption[];
  defaultValues?: readonly string[];
}

function DiscordRadioGroup({ options, defaultValues }: DiscordRadioGroupProps) {
  const selectedValues = new Set(defaultValues ?? []);

  return (
    <div
      className="discord-radio-group"
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '4px',
        padding: '8px 0',
        fontFamily: 'var(--dt-font)',
        fontSize: '14px',
        color: 'var(--dt-text)',
      }}
    >
      {options.map((option, idx) => {
        const isSelected = selectedValues.has(option.value);
        return (
          <div
            key={idx}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px',
              borderRadius: '4px',
              cursor: 'default',
              transition: 'background-color 0.15s ease',
            }}
          >
            <div
              style={{
                width: '24px',
                height: '24px',
                borderRadius: '50%',
                border: isSelected ? 'none' : '2px solid var(--dt-text-subtle)',
                backgroundColor: isSelected ? 'var(--dt-brand)' : 'transparent',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                transition: 'background-color 0.15s ease, border-color 0.15s ease',
              }}
            >
              {isSelected && (
                <div
                  style={{
                    width: '10px',
                    height: '10px',
                    borderRadius: '50%',
                    backgroundColor: 'white',
                  }}
                />
              )}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
              <span style={{ lineHeight: '1.25', color: 'var(--dt-text)' }}>{option.label}</span>
              {option.description && (
                <span
                  style={{
                    fontSize: '12px',
                    color: 'var(--dt-text-muted)',
                    lineHeight: '1.25',
                  }}
                >
                  {option.description}
                </span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default DiscordRadioGroup;
