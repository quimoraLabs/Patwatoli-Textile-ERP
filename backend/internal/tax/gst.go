package tax

import (
	"fmt"
	"math"
)

type GSTCalculation struct {
	TaxableAmount float64 `json:"taxable_amount"`
	CGSTRate      float64 `json:"cgst_rate"`
	SGSTRate      float64 `json:"sgst_rate"`
	CGST          float64 `json:"cgst"`
	SGST          float64 `json:"sgst"`
	TotalTax      float64 `json:"total_tax"`
	TotalAmount   float64 `json:"total_amount"`
}

// Round2 rounds a financial number to two decimal places safely (half away from zero).
func Round2(val float64) float64 {
	return math.Round(val*100) / 100
}

// CalculateGST computes CGST, SGST, and TotalAmount given taxable amount and rates.
func CalculateGST(taxable, cgstRate, sgstRate float64) GSTCalculation {
	taxable = Round2(taxable)
	cgst := Round2(taxable * (cgstRate / 100.0))
	sgst := Round2(taxable * (sgstRate / 100.0))
	totalTax := Round2(cgst + sgst)
	total := Round2(taxable + totalTax)

	return GSTCalculation{
		TaxableAmount: taxable,
		CGSTRate:      cgstRate,
		SGSTRate:      sgstRate,
		CGST:          cgst,
		SGST:          sgst,
		TotalTax:      totalTax,
		TotalAmount:   total,
	}
}

// FormatMoney returns formatted decimal string with 2 decimal places e.g. "12500.00"
func FormatMoney(amount float64) string {
	return fmt.Sprintf("%.2f", Round2(amount))
}
