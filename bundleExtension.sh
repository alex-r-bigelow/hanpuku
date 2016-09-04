#!/bin/bash

read -p "Version number:" VERSION
read -s -p "Password:" PASSWORD
echo
if [ ! -e ~/.adobeCertificate.p12 ]
then
  ZXPSignCmd -selfSignedCert US Utah "Alex Bigelow" "Alex Bigelow" $PASSWORD ~/.adobeCertificate.p12
fi
ZXPSignCmd -sign /Users/home/Library/Application\ Support/Adobe/CEP/extensions/hanpuku ~/Desktop/hanpuku.$VERSION.zxp ~/.adobeCertificate.p12 $PASSWORD
