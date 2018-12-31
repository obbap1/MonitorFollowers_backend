//Apollo server

const {ApolloServer, gql} = require('apollo-server')
const Imap = require('imap'),
	inspect = require('util').inspect

//Function to connect to IMAP
function connectToImap(user,password) {
	const imap = new Imap({
		user: user,
		password: password,
		host: 'imap.gmail.com',
		port: 993,
		tls: true
	})
  
	function openInbox(cb) {
		imap.openBox('INBOX', true, cb)
	}
  
	imap.once('ready', function() {
		openInbox(function(err, box) {
			if (err) throw err
			var f = imap.seq.fetch('1:6', {
				bodies: 'HEADER.FIELDS (FROM TO SUBJECT DATE)',
				struct: true
			})
			f.on('message', function(msg, seqno) {
				console.log('Message #%d', seqno)
				var prefix = '(#' + seqno + ') '
				let getMessages = new Promise((resolve,reject)=>{
					msg.on('body', function(stream, info) {
						var buffer = ''
						stream.on('data', function(chunk) {
							buffer += chunk.toString('utf8')
						})
						stream.once('end', function() {
							console.log(prefix + 'Parsed header: %s', inspect(Imap.parseHeader(buffer)))
						})
						resolve(buffer)
					})
				})
        
				getMessages.then(response =>{
					console.log(response)
				})
				
				msg.once('attributes', function(attrs) {
					console.log(prefix + 'Attributes: %s', inspect(attrs, false, 8))
				})
				msg.once('end', function() {
					console.log(prefix + 'Finished')
				})
			})
			f.once('error', function(err) {
				console.log('Fetch error: ' + err)
			})
			f.once('end', function() {
				console.log('Done fetching all messages!')
				imap.end()
			})
		})
	})
	imap.once('error', function(err) {
		console.log(err)
	})
  
	imap.once('end', function() {
		console.log('Connection ended')
	})
  
	imap.connect()
}

const typeDefs = gql`
    # Make a type user
    type User {
        email: String!
        password: String!
        data: String!
    }

    type Query {
        users: [User]
    }

    type Mutation {
        imapMutation(email: String!, password: String!): User!
    }
`
const resolvers = {
	Mutation:{
		imapMutation: (parent, args) => {

			connectToImap(args.email,args.password)

			const user = {
				email: args.email,
				password: args.password,
				data: 'Successful 😺'
			}
			return user
		}
	}
}



const server = new ApolloServer({typeDefs, resolvers})

server.listen().then(({url})=>{
	console.log(`Server started at ${url}, \n Unai Way ✈️ ✈️ ✈️` )
})
