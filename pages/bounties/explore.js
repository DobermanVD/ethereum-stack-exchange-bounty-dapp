import React, { Component } from 'react';
import {
  Button,
  Table,
  Container,
  Divider,
  Header,
  Loader,
  Dimmer,
} from 'semantic-ui-react';
import { Link } from '../../routes';
import axios from 'axios';
import Layout from '../../components/Layout';
import Head from '../../components/Head';
import QuestionRow from '../../components/QuestionRow';
import bounty from '../../contractInstance';
import web3 from '../../getWeb3';
import listenWeb3 from '../../listenWeb3';
import ens from '../../getEns';
import Status from '../../components/Status';

class ExploreBounty extends Component {
  constructor() {
    super();
    this.state = {
      bountyCount: 0,
      bounties: [],
      isLoading: true,
      userAccount: '',
      networkId: null,
    };
  }

  async componentDidMount() {
    // Get the brower users's account details.
    const accounts = await web3.eth.getAccounts();
    this.setState({ userAccount: accounts[0] });
    listenWeb3(accounts[0]);

    // Get the network ID.
    const networkId = await web3.eth.net.getId();
    this.setState({ networkId });

    // Get the number of bounties in the contract.
    let bountyCount = await bounty.getBountyCount.call();
    bountyCount = bountyCount.toNumber();

    // Get all the bounties from the contract.
    const bounties = await Promise.all(
      Array(bountyCount).fill().map((element, index) => {
        return bounty.bounties.call(index);
      })
    );

    // There may be no active bounties...
    if (bountyCount > 0) {
      // Get all the question IDs from the bounties.
      const ids = Array(bountyCount).fill().map((element, index) => {
        bounties[index] = JSON.parse(JSON.stringify(bounties[index]));
        return bounties[index][1];
      });

      // Catenate the question IDs.
      const idString = ids.join(';');

      // Get the questions from Stack Exchange in a single request.
      const data = await axios.get(`https://api.stackexchange.com/2.2/questions/${idString}?site=ethereum&key=fMcgqnTvxidY8Sk8n1BcbQ((`);

      // Get the question title and the link from the returned question.
      // Push them onto each of their respective bounties in the array.
      data.data.items.map((item, index) => {
        // It's possible multiple bounties are open for the same question ID.
        // Iterate through all the bounties... Is there a better way than this?
        for (var i = 0; i < bountyCount; i++) {
          if (bounties[i][1] == item.question_id) {
            bounties[i].push(item.link);
            bounties[i].push(item.title);
          }
        }
      });

      // Check whether any of the bounty owner addresses can be resolved to ens
      // names.
      for (var i = 0; i < bountyCount; i++) {
        try {
          var resolver = await ens.resolver('richard.test');
          console.log(await resolver.addr());
          console.log(await ens.reverse('0x52f0995a00472a988ab3b4bee04c6085c8a20049').name());
        } catch (error) {
          console.log(error);
        }
      }
    }

    this.setState({ bountyCount, bounties, isLoading: false });
  }

  renderRow() {
    return this.state.bounties.map((bounty, index) => {
      return <QuestionRow
        key={index}
        id={index}
        bounty={bounty}
        userAccount={this.state.userAccount}
      />;
    });
  }

  render() {
    const { Header, Row, HeaderCell, Body } = Table;
    return (
      <Layout>
        <Container>
          <br />
          <Head
            title="Open Bounties"
            type="explore"
            userAccount={this.state.userAccount}
            networkId={this.state.networkId}
          />
          <Dimmer.Dimmable active>
            <Dimmer active={this.state.isLoading} inverted>
              <Loader inverted></Loader>
            </Dimmer>
            <Table>
              <Header>
                <Row>
                  <HeaderCell>SE ID</HeaderCell>
                  <HeaderCell>Question Title and Link</HeaderCell>
                  <HeaderCell>Owner Address / ENS Name</HeaderCell>
                  <HeaderCell>Bounty Value</HeaderCell>
                  <HeaderCell>Actions</HeaderCell>
                </Row>
              </Header>
              <Body>
                {this.renderRow()}
              </Body>
            </Table>
          </Dimmer.Dimmable>
          Found {this.state.bountyCount} active bounties.
        </Container>
      </Layout>
    );
  }
}

export default ExploreBounty;
