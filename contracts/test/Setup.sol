// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.4;

import "./contracts/HEXMock.sol";

//docker run -it -v "%cd%":/src echidna-0.8.4 echidna-test /src/contracts/test/E2E_ShareMinterTest.sol --config /src/contracts/test/E2E_ShareMinterTest.config.yaml
contract SetupHEX {
    HEX public hexContract;

    constructor() {
        hexContract = new HEX();
    }

    function mintTo(address recipient, uint256 hearts) public {
        hexContract.mintHearts(recipient, hearts);
    }
}

contract SetupMinter {
    
}

contract SetupMarket {
    
}