build:
	npm run-script build; go build pathways_server.go
setup:
	export GOOGLE_APPLICATION_CREDENTIALS="pathways-logging.json"
run:
	killall pathways_server; ./pathways_server
deploy:
	export GOOGLE_APPLICATION_CREDENTIALS="pathways-logging.json"; killall pathways_server; npm run-script build; go build pathways_server.go; ./pathways_server & disown 
clean:
	killall pathways_server; rm -f pathways_server; rm -f static/*.bundle.js
stop:
	killall pathways_server
