package invoice

import (
	"fmt"
	"strconv"
	"time"

	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

func FinancialYear(t time.Time) string {
	year := t.Year()
	month := t.Month()

	var startYear, endYear int
	if month >= time.April {
		startYear = year
		endYear = (year + 1) % 100
	} else {
		startYear = year - 1
		endYear = year % 100
	}

	return fmt.Sprintf("%d-%02d", startYear, endYear)
}

func GenerateNextInvoiceNo(tx *gorm.DB, invoiceDate time.Time) (string, error) {
	// Lock setting rows for sequential atomic numbering
	var prefixVal, seqVal string

	rowPrefix := tx.Clauses(clause.Locking{Strength: "UPDATE"}).
		Table("settings").
		Where("key = ?", "invoice.prefix").
		Select("value").Row()
	if err := rowPrefix.Scan(&prefixVal); err != nil || prefixVal == "" {
		prefixVal = "PTX"
	}

	rowSeq := tx.Clauses(clause.Locking{Strength: "UPDATE"}).
		Table("settings").
		Where("key = ?", "invoice.next_seq").
		Select("value").Row()
	if err := rowSeq.Scan(&seqVal); err != nil || seqVal == "" {
		seqVal = "1"
	}

	seqInt, err := strconv.Atoi(seqVal)
	if err != nil || seqInt < 1 {
		seqInt = 1
	}

	fy := FinancialYear(invoiceDate)
	invoiceNo := fmt.Sprintf("%s/%s/%04d", prefixVal, fy, seqInt)

	// Increment next sequence in settings
	nextSeq := strconv.Itoa(seqInt + 1)
	if err := tx.Table("settings").Where("key = ?", "invoice.next_seq").Update("value", nextSeq).Error; err != nil {
		return "", err
	}

	return invoiceNo, nil
}
