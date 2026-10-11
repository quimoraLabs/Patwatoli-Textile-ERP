package tax

import (
	"testing"
)

func TestCalculateGST(t *testing.T) {
	// Example: 10000.00 taxable, 2.5% CGST, 2.5% SGST
	calc := CalculateGST(10000.00, 2.5, 2.5)

	if calc.TaxableAmount != 10000.00 {
		t.Errorf("expected taxable 10000.00, got %f", calc.TaxableAmount)
	}
	if calc.CGST != 250.00 {
		t.Errorf("expected CGST 250.00, got %f", calc.CGST)
	}
	if calc.SGST != 250.00 {
		t.Errorf("expected SGST 250.00, got %f", calc.SGST)
	}
	if calc.TotalTax != 500.00 {
		t.Errorf("expected total tax 500.00, got %f", calc.TotalTax)
	}
	if calc.TotalAmount != 10500.00 {
		t.Errorf("expected total amount 10500.00, got %f", calc.TotalAmount)
	}
}

func TestRound2(t *testing.T) {
	tests := []struct {
		input    float64
		expected float64
	}{
		{12.345, 12.35},
		{12.344, 12.34},
		{100.001, 100.00},
		{99.999, 100.00},
		{0.0, 0.0},
	}

	for _, tt := range tests {
		got := Round2(tt.input)
		if got != tt.expected {
			t.Errorf("Round2(%f) = %f; expected %f", tt.input, got, tt.expected)
		}
	}
}

func TestFormatMoney(t *testing.T) {
	if got := FormatMoney(12500); got != "12500.00" {
		t.Errorf("expected 12500.00, got %s", got)
	}
	if got := FormatMoney(45.5); got != "45.50" {
		t.Errorf("expected 45.50, got %s", got)
	}
}
