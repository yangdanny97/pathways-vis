build:
	npm run-script build; go build pathways_server.go; ./pathways_server
setup:
	export GOOGLE_APPLICATION_CREDENTIALS="pathways-logging.json"
run:
	./pathways_server
clean:
	rm -f pathways_server; rm -f static/*.bundle.js
