bootloader --timeout=1
zerombr
clearpart --all
autopart

rootpw testcase

timezone --utc Europe/Prague

%packages
@^workstation-product-environment
domain-client-nonexisting
%end
