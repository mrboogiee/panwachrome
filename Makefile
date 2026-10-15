SRCDIR = panwachrome
ZIPFILE = panwachrome.zip

# Chrome Web Store package: manifest.json must be at the root of the zip.
# Sources are shipped as-is (unminified) so reviewers can read them.
all: $(ZIPFILE)

$(ZIPFILE): $(shell find $(SRCDIR) -type f -not -name '.DS_Store')
	rm -f $@
	cd $(SRCDIR) && zip -r -X ../$@ . -x '*.DS_Store'

clean:
	rm -f $(ZIPFILE)

.PHONY : all clean
