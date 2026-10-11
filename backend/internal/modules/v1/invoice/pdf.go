package invoice

import (
	"bytes"
	"fmt"
	"strings"

	"github.com/go-pdf/fpdf"
)

type CompanySettings struct {
	Name    string
	Address string
	GSTIN   string
}

func GenerateInvoicePDF(inv *Invoice, company CompanySettings) ([]byte, error) {
	pdf := fpdf.New("P", "mm", "A4", "")
	pdf.SetMargins(15, 15, 15)
	pdf.AddPage()

	// Header
	pdf.SetFont("Arial", "B", 18)
	pdf.SetTextColor(30, 41, 59)
	pdf.Cell(100, 8, company.Name)

	pdf.SetFont("Arial", "B", 14)
	pdf.SetTextColor(79, 70, 229)
	pdf.CellFormat(80, 8, "TAX INVOICE", "", 1, "R", false, 0, "")

	pdf.SetFont("Arial", "", 9)
	pdf.SetTextColor(100, 116, 139)
	pdf.Cell(100, 5, company.Address)
	pdf.CellFormat(80, 5, fmt.Sprintf("Invoice #: %s", inv.InvoiceNo), "", 1, "R", false, 0, "")

	gstinText := ""
	if company.GSTIN != "" {
		gstinText = fmt.Sprintf("GSTIN: %s", company.GSTIN)
	}
	pdf.Cell(100, 5, gstinText)
	pdf.CellFormat(80, 5, fmt.Sprintf("Date: %s", inv.InvoiceDate.Format("02-01-2006")), "", 1, "R", false, 0, "")

	if inv.Status == "cancelled" {
		pdf.SetTextColor(220, 38, 38)
		pdf.SetFont("Arial", "B", 12)
		pdf.CellFormat(180, 7, "*** CANCELLED ***", "", 1, "R", false, 0, "")
	}

	pdf.Ln(6)

	// Divider
	pdf.SetDrawColor(226, 232, 240)
	pdf.SetLineWidth(0.5)
	pdf.Line(15, pdf.GetY(), 195, pdf.GetY())
	pdf.Ln(6)

	// Bill To Section
	pdf.SetFont("Arial", "B", 10)
	pdf.SetTextColor(30, 41, 59)
	pdf.Cell(180, 6, "BILL TO (व्यापारी):")
	pdf.Ln(6)

	pdf.SetFont("Arial", "B", 11)
	pdf.SetTextColor(15, 23, 42)
	pdf.Cell(180, 5, inv.Merchant.Name)
	pdf.Ln(5)

	pdf.SetFont("Arial", "", 9)
	pdf.SetTextColor(71, 85, 105)
	if inv.Merchant.Phone != "" {
		pdf.Cell(180, 5, fmt.Sprintf("Phone: %s", inv.Merchant.Phone))
		pdf.Ln(5)
	}
	if inv.Merchant.Address != "" {
		pdf.Cell(180, 5, fmt.Sprintf("Address: %s", inv.Merchant.Address))
		pdf.Ln(5)
	}
	if inv.Merchant.GSTIN != nil && *inv.Merchant.GSTIN != "" {
		pdf.Cell(180, 5, fmt.Sprintf("GSTIN: %s", *inv.Merchant.GSTIN))
		pdf.Ln(5)
	}

	pdf.Ln(6)

	// Table Header
	pdf.SetFillColor(241, 245, 249)
	pdf.SetTextColor(30, 41, 59)
	pdf.SetFont("Arial", "B", 9)

	pdf.CellFormat(12, 8, "#", "1", 0, "C", true, 0, "")
	pdf.CellFormat(68, 8, "Item Description", "1", 0, "L", true, 0, "")
	pdf.CellFormat(20, 8, "Size", "1", 0, "C", true, 0, "")
	pdf.CellFormat(25, 8, "Qty", "1", 0, "R", true, 0, "")
	pdf.CellFormat(25, 8, "Rate (Rs)", "1", 0, "R", true, 0, "")
	pdf.CellFormat(30, 8, "Amount (Rs)", "1", 1, "R", true, 0, "")

	// Table Rows
	pdf.SetFont("Arial", "", 9)
	pdf.SetTextColor(51, 65, 85)

	for i, item := range inv.Items {
		itemDesc := item.Item.Name
		if item.Item.Unit != "" {
			itemDesc = fmt.Sprintf("%s (%s)", itemDesc, item.Item.Unit)
		}

		pdf.CellFormat(12, 7, fmt.Sprintf("%d", i+1), "1", 0, "C", false, 0, "")
		pdf.CellFormat(68, 7, itemDesc, "1", 0, "L", false, 0, "")
		pdf.CellFormat(20, 7, item.Variant.Size, "1", 0, "C", false, 0, "")
		pdf.CellFormat(25, 7, fmt.Sprintf("%.2f", item.Qty), "1", 0, "R", false, 0, "")
		pdf.CellFormat(25, 7, fmt.Sprintf("%.2f", item.Rate), "1", 0, "R", false, 0, "")
		pdf.CellFormat(30, 7, fmt.Sprintf("%.2f", item.Amount), "1", 1, "R", false, 0, "")
	}

	// Totals Block
	pdf.Ln(4)
	pdf.SetFont("Arial", "", 9)
	pdf.CellFormat(125, 6, "Taxable Amount:", "", 0, "R", false, 0, "")
	pdf.CellFormat(55, 6, fmt.Sprintf("Rs. %.2f", inv.TaxableAmount), "", 1, "R", false, 0, "")

	if inv.CGST > 0 {
		pdf.CellFormat(125, 6, "CGST (2.5%):", "", 0, "R", false, 0, "")
		pdf.CellFormat(55, 6, fmt.Sprintf("Rs. %.2f", inv.CGST), "", 1, "R", false, 0, "")
	}

	if inv.SGST > 0 {
		pdf.CellFormat(125, 6, "SGST (2.5%):", "", 0, "R", false, 0, "")
		pdf.CellFormat(55, 6, fmt.Sprintf("Rs. %.2f", inv.SGST), "", 1, "R", false, 0, "")
	}

	pdf.SetFont("Arial", "B", 11)
	pdf.SetTextColor(30, 41, 59)
	pdf.CellFormat(125, 8, "Grand Total:", "", 0, "R", false, 0, "")
	pdf.CellFormat(55, 8, fmt.Sprintf("Rs. %.2f", inv.TotalAmount), "", 1, "R", false, 0, "")

	if inv.Status == "cancelled" && inv.CancelReason != nil {
		pdf.Ln(4)
		pdf.SetTextColor(220, 38, 38)
		pdf.SetFont("Arial", "I", 9)
		pdf.CellFormat(180, 6, fmt.Sprintf("Cancellation Reason: %s", *inv.CancelReason), "", 1, "L", false, 0, "")
	}

	pdf.Ln(15)
	pdf.SetFont("Arial", "", 8)
	pdf.SetTextColor(100, 116, 139)
	pdf.CellFormat(180, 4, strings.Repeat("-", 100), "", 1, "C", false, 0, "")
	pdf.CellFormat(180, 4, "Computer generated invoice. No signature required.", "", 1, "C", false, 0, "")

	var buf bytes.Buffer
	err := pdf.Output(&buf)
	if err != nil {
		return nil, err
	}

	return buf.Bytes(), nil
}
