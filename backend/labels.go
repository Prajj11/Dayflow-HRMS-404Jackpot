package main

const timezone = "Asia/Kolkata"

// events whose access point was never recorded are grouped under this label
const unknownDoor = "Unknown door"

func peakLabel(h int) string {
	switch {
	case h < 11:
		return "morning"
	case h < 15:
		return "lunch"
	case h < 18:
		return "afternoon"
	default:
		return "evening"
	}
}
