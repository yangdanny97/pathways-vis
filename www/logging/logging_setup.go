package main

import (
	"database/sql"
	"fmt"

	_ "github.com/mattn/go-sqlite3"
)

func main() {
	database, err := sql.Open("sqlite3", "./pathways_logging.db")
	if err != nil {
		fmt.Println(err)
		fmt.Println("DB open error")
		return
	}
	statement, err := database.Prepare("CREATE TABLE IF NOT EXISTS logs (id INTEGER PRIMARY KEY, user TEXT, log TEXT)")
	if err != nil {
		fmt.Println(err)
		fmt.Println("DB prepare error")
		return
	}
	_, err = statement.Exec()
	if err != nil {
		fmt.Println(err)
		fmt.Println("DB execute error")
		return
	}
}
