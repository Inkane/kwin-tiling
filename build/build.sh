#!/bin/bash
scriptname="tiling.kwinscript"
if [ -f ${scriptname} ]; then
	rm ${scriptname}
fi
zip -r ${scriptname}  ../metadata.desktop ../contents
plasmapkg -t kwinscript -r tiling
plasmapkg -t kwinscript -i ${scriptname}
