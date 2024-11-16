const jwt=require('jsonwebtoken');

const protectRoute=(requiredRoles=[]) => {
  return async(req, res, next) => {

    const token=req.cookies.token;

    if(!token){
      return res.status(401).json({error: 'Unauthorized'});
    }

    try{
      const decoded=jwt.verify(token, process.env.JWT_SECRET);

      req._id=decoded._id;
      req.role=decoded.role;

      // console.log(decoded);

      if(requiredRoles.length>0 && !requiredRoles.includes(req.role)){
        return res.status(403).json({error: 'Forbidden'});
      }

      next();
    }
    catch(err){
      console.log(err);
      // incase of expired jwt or invalid token kill the token and clear the cookie
      res.clearCookie('token', {path: '/', domain: 'localhost', sameSite: 'none', secure: true});
      res.status(401).json({error: 'Unauthorized'});
    }
  }
}

module.exports=protectRoute;