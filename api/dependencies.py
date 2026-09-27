from fastapi import Request

def get_df(request: Request):
    """Dependency to retrieve the global dataset"""
    return request.app.state.df

def get_model(request: Request):
    """Dependency to retrieve the global prediction model"""
    return request.app.state.model
